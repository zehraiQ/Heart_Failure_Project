from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import sqlite3
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
 
app = FastAPI(title="Heart Failure Prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Geliştirme aşamasında tüm kaynaklara izin verilir, üretimde bunu sınırlandırmak önemlidir.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )
 
# ==========================================
# 1. Sunucu başlatıldığında modelleri yükle (Görev 6.2)
# ==========================================
import os
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")
 
try:
    scaler = joblib.load(os.path.join(MODELS_DIR, "scaler.pkl"))
    dt_model = joblib.load(os.path.join(MODELS_DIR, "decision_tree_model.pkl"))
    knn_model = joblib.load(os.path.join(MODELS_DIR, "knn_model.pkl"))
    nb_model = joblib.load(os.path.join(MODELS_DIR, "naive_bayes_model.pkl"))
    rf_model = joblib.load(os.path.join(MODELS_DIR, "random_forest_model.pkl"))
       
    print("✅ Tüm modeller ve Scaler başarıyla yüklendi!")
except Exception as e:
    print(f"❌ Modeller yüklenirken hata oluştu: {e}")
 
# ==========================================
# 2. Hastadan alınacak verilerin formatını belirle (Görev 7.2)
# ==========================================
class PatientData(BaseModel):
    age: float
    anaemia: int
    creatinine_phosphokinase: int
    diabetes: int
    ejection_fraction: int
    high_blood_pressure: int
    platelets: float
    serum_creatinine: float
    serum_sodium: int
    sex: int
    smoking: int
    time: int
 
# ==========================================
# 3. Yardımcı Fonksiyon / Helper Function (Görev 6.3)
# ==========================================
def preprocess_data(raw_features: list):
    """
    Kullanıcıdan gelen ham veriyi alır ve modellerin
    anlayabileceği şekilde Scaler'dan geçirir.
    """
    # Veriyi numpy dizisine çevir ve (1, -1) formatında yeniden şekillendir
    input_data = np.array(raw_features).reshape(1, -1)
   
    # Veriyi ölçeklendir (Scale)
    scaled_data = scaler.transform(input_data)
    return scaled_data
 
# ==========================================
# 4. Yönlendirmeler (Routes)
# ==========================================

 
@app.post("/predict")
def make_prediction(data: PatientData):
    try:
        # Gelen verileri doğru sırayla bir listeye yerleştir
        raw_features = [
            data.age, data.anaemia, data.creatinine_phosphokinase, data.diabetes,
            data.ejection_fraction, data.high_blood_pressure, data.platelets,
            data.serum_creatinine, data.serum_sodium, data.sex, data.smoking, data.time
        ]
       
        # Veriyi işle ve hazırlığını yap
        processed_data = preprocess_data(raw_features)
       
        # Tahminleri yap
        dt_pred = int(dt_model.predict(processed_data)[0])
        knn_pred = int(knn_model.predict(processed_data)[0])
        nb_pred = int(nb_model.predict(processed_data)[0])
        rf_pred = int(rf_model.predict(processed_data)[0])
       
       # ============================================================
        # 5. VERİTABANINA KAYIT İŞLEMİ (Görev 8.2)
        # ============================================================
        try:
           db_path = os.path.join(os.path.dirname(BASE_DIR), "Database", "HeartFailure_DB.db")
            with sqlite3.connect(db_path) as conn:
                cursor = conn.cursor()
                all_values = raw_features + [rf_pred]
                cursor.execute('''
                    INSERT INTO heart_failure_records
                    (age, anaemia, creatinine_phosphokinase, diabetes, ejection_fraction,
                     high_blood_pressure, platelets, serum_creatinine, serum_sodium,
                     sex, smoking, time, DEATH_EVENT)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', all_values)
                conn.commit()
                print("✅ Veri başarıyla veritabanına kaydedildi.")
        except Exception as db_error:
            print(f"⚠️ Veritabanı kayıt hatası: {db_error}")
        # ============================================================
           
        return {
            "status": "success",
            "decision_tree": dt_pred,
            "knn": knn_pred,
            "naive_bayes": nb_pred,
            "random_forest": rf_pred
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Tahmin yapılırken hata oluştu: {str(e)}")
     # ==========================================
# 5.(Frontend)
# ==========================================
frontend_path = os.path.join("..", "Frontend")
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="Frontend")
